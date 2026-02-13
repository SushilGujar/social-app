import React from 'react'
import {View} from 'react-native'
import {Image as ExpoImage} from 'expo-image'
import {
  type ImagePickerOptions,
  launchImageLibraryAsync,
  UIImagePickerPreferredAssetRepresentationMode,
} from 'expo-image-picker'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {usePhotoLibraryPermission} from '#/lib/hooks/usePermissions'
import {compressIfNeeded} from '#/lib/media/manip'
import {openCropper} from '#/lib/media/picker'
import {getDataUriSize} from '#/lib/media/util'
import {useRequestNotificationsPermission} from '#/lib/notifications/notifications'
import {isCancelledError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {ChatBubble} from '#/screens/Onboarding/ChatBubble'
import {OnboardingControls} from '#/screens/Onboarding/Layout'
import {useOnboardingInternalState} from '#/screens/Onboarding/state'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {useSheetWrapper} from '#/components/Dialog/sheet-wrapper'
import * as TextField from '#/components/forms/TextField'
import {CircleInfo_Stroke2_Corner0_Rounded} from '#/components/icons/CircleInfo'
import {UserCircle_Stroke2_Corner0_Rounded as UserCircleIcon} from '#/components/icons/UserCircle'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {IS_NATIVE, IS_WEB} from '#/env'

export function StepProfile() {
  const ax = useAnalytics()
  const {_} = useLingui()
  const t = useTheme()
  const {requestPhotoAccessIfNeeded} = usePhotoLibraryPermission()
  const requestNotificationsPermission = useRequestNotificationsPermission()

  const {state, dispatch} = useOnboardingInternalState()
  const [displayName, setDisplayName] = React.useState(
    state.profileStepResults?.displayName || '',
  )
  const [image, setImage] = React.useState(state.profileStepResults?.image)
  const [imageUri, setImageUri] = React.useState(
    state.profileStepResults?.imageUri || '',
  )
  const [error, setError] = React.useState('')
  const [showPhotoBubble, setShowPhotoBubble] = React.useState(
    displayName.length > 0,
  )

  React.useEffect(() => {
    requestNotificationsPermission('StartOnboarding')
  }, [requestNotificationsPermission])

  const sheetWrapper = useSheetWrapper()
  const openPicker = React.useCallback(
    async (opts?: ImagePickerOptions) => {
      const response = await sheetWrapper(
        launchImageLibraryAsync({
          exif: false,
          mediaTypes: ['images'],
          quality: 1,
          ...opts,
          legacy: true,
          preferredAssetRepresentationMode:
            UIImagePickerPreferredAssetRepresentationMode.Automatic,
        }),
      )

      return (response.assets ?? [])
        .slice(0, 1)
        .filter(asset => {
          if (
            !asset.mimeType?.startsWith('image/') ||
            (!asset.mimeType?.endsWith('jpeg') &&
              !asset.mimeType?.endsWith('jpg') &&
              !asset.mimeType?.endsWith('png'))
          ) {
            setError(_(msg`Only .jpg and .png files are supported`))
            return false
          }
          return true
        })
        .map(img => ({
          mime: 'image/jpeg',
          height: img.height,
          width: img.width,
          path: img.uri,
          size: getDataUriSize(img.uri),
        }))
    },
    [_, setError, sheetWrapper],
  )

  const openLibrary = React.useCallback(async () => {
    if (!(await requestPhotoAccessIfNeeded())) {
      return
    }

    setError('')

    const items = await sheetWrapper(
      openPicker({
        aspect: [1, 1],
      }),
    )
    let picked = items[0]
    if (!picked) return

    if (!IS_WEB) {
      try {
        picked = await openCropper({
          imageUri: picked.path,
          shape: 'circle',
          aspectRatio: 1 / 1,
        })
      } catch (e) {
        if (!isCancelledError(e)) {
          logger.error('Failed to crop avatar in onboarding', {error: e})
        }
      }
    }
    picked = await compressIfNeeded(picked, 1000000)

    if (IS_NATIVE) {
      await ExpoImage.prefetch(picked.path)
    }

    setImage(picked)
    setImageUri(picked.path)
  }, [requestPhotoAccessIfNeeded, openPicker, setError, sheetWrapper])

  const onContinue = React.useCallback(async () => {
    dispatch({
      type: 'setProfileStepResults',
      displayName,
      image,
      imageUri: imageUri || undefined,
      imageMime: image?.mime ?? 'image/jpeg',
    })

    dispatch({type: 'next'})
    ax.metric('onboarding:profile:nextPressed', {})
  }, [ax, displayName, image, imageUri, dispatch])

  const handleNameChange = (text: string) => {
    setDisplayName(text)
    if (text.length > 0 && !showPhotoBubble) {
      setShowPhotoBubble(true)
    }
  }

  return (
    <View style={[a.align_start, a.gap_md]}>
      <ChatBubble>
        <Trans>Welcome to Pulse! What should we call you?</Trans>
      </ChatBubble>

      <View style={[a.w_full, a.px_xs, a.mb_sm]}>
        <TextField.Root>
          <TextField.Input
            label={_(msg`Your name`)}
            placeholder={_(msg`Enter your display name`)}
            defaultValue={displayName}
            onChangeText={handleNameChange}
            autoCapitalize="words"
            autoFocus
          />
        </TextField.Root>
      </View>

      {showPhotoBubble && (
        <>
          <ChatBubble delay={200}>
            <Trans>
              Nice to meet you{displayName ? `, ${displayName}` : ''}! Want to
              add a profile photo?
            </Trans>
          </ChatBubble>

          <View style={[a.w_full, a.align_center, a.py_lg]}>
            <Button
              label={_(msg`Add a profile photo`)}
              onPress={openLibrary}
              color="secondary"
              size="large"
              shape="round"
              style={[{width: 100, height: 100}]}>
              {imageUri ? (
                <ExpoImage
                  source={{uri: imageUri}}
                  style={[a.w_full, a.h_full, a.rounded_full]}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <UserCircleIcon size="xl" style={[t.atoms.text_contrast_low]} />
              )}
            </Button>

            {!imageUri && (
              <Text
                style={[
                  a.text_sm,
                  a.mt_sm,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>Tap to upload</Trans>
              </Text>
            )}
          </View>

          {error && (
            <View
              style={[
                a.flex_row,
                a.gap_sm,
                a.align_center,
                a.py_md,
                a.px_lg,
                a.border,
                a.rounded_md,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_low,
              ]}>
              <CircleInfo_Stroke2_Corner0_Rounded size="sm" />
              <Text style={[a.leading_snug]}>{error}</Text>
            </View>
          )}
        </>
      )}

      <OnboardingControls.Portal>
        <Button
          testID="onboardingContinue"
          disabled={!displayName.trim()}
          color="primary"
          size="large"
          label={_(msg`Continue to next step`)}
          onPress={onContinue}>
          <ButtonText>
            <Trans>Continue</Trans>
          </ButtonText>
        </Button>
      </OnboardingControls.Portal>
    </View>
  )
}
