import {useCallback, useState} from 'react'
import {View} from 'react-native'
import {
  type AppBskyActorDefs,
  type AppBskyActorProfile,
  type AppBskyGraphDefs,
  AppBskyGraphStarterpack,
  type Un$Typed,
} from '@atproto/api'
import {TID} from '@atproto/common-web'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {uploadBlob} from '#/lib/api'
import {
  BSKY_APP_ACCOUNT_DID,
  DISCOVER_SAVED_FEED,
  TIMELINE_SAVED_FEED,
  VIDEO_SAVED_FEED,
} from '#/lib/constants'
import {useRequestNotificationsPermission} from '#/lib/notifications/notifications'
import {logger} from '#/logger'
import {useSetHasCheckedForStarterPack} from '#/state/preferences/used-starter-packs'
import {getAllListMembers} from '#/state/queries/list-members'
import {preferencesQueryKey} from '#/state/queries/preferences'
import {RQKEY as profileRQKey} from '#/state/queries/profile'
import {useAgent} from '#/state/session'
import {useOnboardingDispatch} from '#/state/shell'
import {useProgressGuideControls} from '#/state/shell/progress-guide'
import {
  useActiveStarterPack,
  useSetActiveStarterPack,
} from '#/state/shell/starter-pack'
import {ChatBubble} from '#/screens/Onboarding/ChatBubble'
import {OnboardingControls} from '#/screens/Onboarding/Layout'
import {useOnboardingInternalState} from '#/screens/Onboarding/state'
import {bulkWriteFollows} from '#/screens/Onboarding/util'
import {atoms as a} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ArrowRight_Stroke2_Corner0_Rounded as ArrowRight} from '#/components/icons/Arrow'
import {Loader} from '#/components/Loader'
import {useAnalytics} from '#/analytics'
import * as bsky from '#/types/bsky'

export function StepFinished() {
  const {state, dispatch} = useOnboardingInternalState()
  const {_} = useLingui()
  const ax = useAnalytics()
  const onboardDispatch = useOnboardingDispatch()
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const agent = useAgent()
  const requestNotificationsPermission = useRequestNotificationsPermission()
  const activeStarterPack = useActiveStarterPack()
  const setActiveStarterPack = useSetActiveStarterPack()
  const setHasCheckedForStarterPack = useSetHasCheckedForStarterPack()
  const {startProgressGuide} = useProgressGuideControls()

  const finishOnboarding = useCallback(async () => {
    setSaving(true)

    let starterPack: AppBskyGraphDefs.StarterPackView | undefined
    let listItems: AppBskyGraphDefs.ListItemView[] | undefined

    if (activeStarterPack?.uri) {
      try {
        const spRes = await agent.app.bsky.graph.getStarterPack({
          starterPack: activeStarterPack.uri,
        })
        starterPack = spRes.data.starterPack
      } catch (e) {
        logger.error('Failed to fetch starter pack', {safeMessage: e})
      }
      try {
        if (starterPack?.list) {
          listItems = await getAllListMembers(agent, starterPack.list.uri)
        }
      } catch (e) {
        logger.error('Failed to fetch starter pack list items', {
          safeMessage: e,
        })
      }
    }

    try {
      const {interestsStepResults, profileStepResults} = state
      const {selectedInterests} = interestsStepResults

      await Promise.all([
        bulkWriteFollows(agent, [
          BSKY_APP_ACCOUNT_DID,
          ...(listItems?.map(i => i.subject.did) ?? []),
        ]),
        (async () => {
          await agent.setInterestsPref({tags: selectedInterests})

          const feedsToSave: AppBskyActorDefs.SavedFeed[] = [
            {
              ...DISCOVER_SAVED_FEED,
              id: TID.nextStr(),
            },
            {
              ...TIMELINE_SAVED_FEED,
              id: TID.nextStr(),
            },
            {
              ...VIDEO_SAVED_FEED,
              id: TID.nextStr(),
            },
          ]

          if (starterPack && starterPack.feeds?.length) {
            feedsToSave.push(
              ...starterPack.feeds.map(f => ({
                type: 'feed',
                value: f.uri,
                pinned: true,
                id: TID.nextStr(),
              })),
            )
          }

          await agent.overwriteSavedFeeds(feedsToSave)
        })(),
        (async () => {
          const {imageUri, imageMime} = profileStepResults
          const blobPromise =
            imageUri && imageMime
              ? uploadBlob(agent, imageUri, imageMime)
              : undefined

          await agent.upsertProfile(async existing => {
            let next: Un$Typed<AppBskyActorProfile.Record> = existing ?? {}

            if (blobPromise) {
              const res = await blobPromise
              if (res.data.blob) {
                next.avatar = res.data.blob
              }
            }

            if (starterPack) {
              next.joinedViaStarterPack = {
                uri: starterPack.uri,
                cid: starterPack.cid,
              }
            }

            next.displayName = profileStepResults.displayName || ''

            if (!next.createdAt) {
              next.createdAt = new Date().toISOString()
            }
            return next
          })

          ax.metric('onboarding:finished:avatarResult', {
            avatarResult: profileStepResults.image ? 'uploaded' : 'default',
          })
        })(),
        requestNotificationsPermission('AfterOnboarding'),
      ])
    } catch (e: any) {
      logger.info(`onboarding: bulk save failed`)
      logger.error(e)
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: preferencesQueryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: profileRQKey(agent.session?.did ?? ''),
      }),
    ]).catch(e => {
      logger.error(e)
    })

    setSaving(false)
    setActiveStarterPack(undefined)
    setHasCheckedForStarterPack(true)
    startProgressGuide('follow-10')
    dispatch({type: 'finish'})
    onboardDispatch({type: 'finish'})
    ax.metric('onboarding:finished:nextPressed', {
      usedStarterPack: Boolean(starterPack),
      starterPackName:
        starterPack &&
        bsky.dangerousIsType<AppBskyGraphStarterpack.Record>(
          starterPack.record,
          AppBskyGraphStarterpack.isRecord,
        )
          ? starterPack.record.name
          : undefined,
      starterPackCreator: starterPack?.creator.did,
      starterPackUri: starterPack?.uri,
      profilesFollowed: listItems?.length ?? 0,
      feedsPinned: starterPack?.feeds?.length ?? 0,
    })
    if (starterPack && listItems?.length) {
      ax.metric('starterPack:followAll', {
        logContext: 'Onboarding',
        starterPack: starterPack.uri,
        count: listItems?.length,
      })
    }
  }, [
    ax,
    queryClient,
    agent,
    dispatch,
    onboardDispatch,
    activeStarterPack,
    state,
    requestNotificationsPermission,
    setActiveStarterPack,
    setHasCheckedForStarterPack,
    startProgressGuide,
  ])

  return (
    <View style={[a.align_start, a.gap_md]}>
      <ChatBubble>
        <Trans>You're all set! Your Pulse feed is ready.</Trans>
      </ChatBubble>

      <ChatBubble delay={400}>
        <Trans>
          We've set things up based on your interests. You can always customize
          later.
        </Trans>
      </ChatBubble>

      <OnboardingControls.Portal>
        <Button
          testID="onboardingFinish"
          disabled={saving}
          color="primary"
          size="large"
          label={_(msg`Complete onboarding and start using your account`)}
          onPress={finishOnboarding}>
          <ButtonText>
            {saving ? (
              <Trans>Finalizing</Trans>
            ) : (
              <Trans>Let's go!</Trans>
            )}
          </ButtonText>
          <ButtonIcon icon={saving ? Loader : ArrowRight} />
        </Button>
      </OnboardingControls.Portal>
    </View>
  )
}
