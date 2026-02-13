import React, {useRef, useState} from 'react'
import {type TextInput, View} from 'react-native'
import Animated, {FadeInUp} from 'react-native-reanimated'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import * as EmailValidator from 'email-validator'
import type tldts from 'tldts'

import {isEmailMaybeInvalid} from '#/lib/strings/email'
import {logger} from '#/logger'
import {ChatBubble} from '#/screens/Onboarding/ChatBubble'
import {useSignupContext} from '#/screens/Signup/state'
import {Policies} from '#/screens/Signup/StepInfo/Policies'
import {atoms as a, native} from '#/alf'
import * as Admonition from '#/components/Admonition'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {DeviceLocationRequestDialog} from '#/components/dialogs/DeviceLocationRequestDialog'
import * as DateField from '#/components/forms/DateField'
import {type DateFieldRef} from '#/components/forms/DateField/types'
import {FormError} from '#/components/forms/FormError'
import * as TextField from '#/components/forms/TextField'
import {Envelope_Stroke2_Corner0_Rounded as Envelope} from '#/components/icons/Envelope'
import {Lock_Stroke2_Corner0_Rounded as Lock} from '#/components/icons/Lock'
import {Ticket_Stroke2_Corner0_Rounded as Ticket} from '#/components/icons/Ticket'
import {createStaticClick, SimpleInlineLinkText} from '#/components/Link'
import {Loader} from '#/components/Loader'
import {usePreemptivelyCompleteActivePolicyUpdate} from '#/components/PolicyUpdateOverlay/usePreemptivelyCompleteActivePolicyUpdate'
import * as Toast from '#/components/Toast'
import {
  isUnderAge,
  MIN_ACCESS_AGE,
  useAgeAssuranceRegionConfigWithFallback,
} from '#/ageAssurance/util'
import {useAnalytics} from '#/analytics'
import {IS_NATIVE} from '#/env'
import {
  useDeviceGeolocationApi,
  useIsDeviceGeolocationGranted,
} from '#/geolocation'

type InfoSubStep = 'email' | 'password' | 'birthdate'

function sanitizeDate(date: Date): Date {
  if (!date || date.toString() === 'Invalid Date') {
    logger.error(`Create account: handled invalid date for birthDate`, {
      hasDate: !!date,
    })
    return new Date()
  }
  return date
}

export function StepInfo({
  onPressBack,
  isServerError,
  refetchServer,
  isLoadingStarterPack,
}: {
  onPressBack: () => void
  isServerError: boolean
  refetchServer: () => void
  isLoadingStarterPack: boolean
}) {
  const {_} = useLingui()
  const ax = useAnalytics()
  const {state, dispatch} = useSignupContext()
  const preemptivelyCompleteActivePolicyUpdate =
    usePreemptivelyCompleteActivePolicyUpdate()

  const [subStep, setSubStep] = useState<InfoSubStep>('email')

  const inviteCodeValueRef = useRef<string>(state.inviteCode)
  const emailValueRef = useRef<string>(state.email)
  const prevEmailValueRef = useRef<string>(state.email)
  const passwordValueRef = useRef<string>(state.password)

  // Store confirmed values for display in user bubbles
  const [confirmedEmail, setConfirmedEmail] = useState(state.email)
  const [confirmedPassword, setConfirmedPassword] = useState(state.password)

  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const birthdateInputRef = useRef<DateFieldRef>(null)

  const aaRegionConfig = useAgeAssuranceRegionConfigWithFallback()
  const {setDeviceGeolocation} = useDeviceGeolocationApi()
  const locationControl = Dialog.useDialogControl()
  const isOverRegionMinAccessAge = state.dateOfBirth
    ? !isUnderAge(state.dateOfBirth.toISOString(), aaRegionConfig.minAccessAge)
    : true
  const isOverAppMinAccessAge = state.dateOfBirth
    ? !isUnderAge(state.dateOfBirth.toISOString(), MIN_ACCESS_AGE)
    : true
  const isOverMinAdultAge = state.dateOfBirth
    ? !isUnderAge(state.dateOfBirth.toISOString(), 18)
    : true
  const isDeviceGeolocationGranted = useIsDeviceGeolocationGranted()

  const [hasWarnedEmail, setHasWarnedEmail] = useState<boolean>(false)

  const tldtsRef = React.useRef<typeof tldts>(undefined)
  React.useEffect(() => {
    // @ts-expect-error - valid path
    import('tldts/dist/index.cjs.min.js').then(tldts => {
      tldtsRef.current = tldts
    })
    // This will get used in the avatar creator a few steps later, so lets preload it now
    // @ts-expect-error - valid path
    import('react-native-view-shot/src/index')
  }, [])

  const onEmailNext = () => {
    const inviteCode = inviteCodeValueRef.current
    const email = emailValueRef.current
    const emailChanged = prevEmailValueRef.current !== email

    if (state.serviceDescription?.inviteCodeRequired && !inviteCode) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please enter your invite code.`),
        field: 'invite-code',
      })
    }
    if (!email) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please enter your email.`),
        field: 'email',
      })
    }
    if (!EmailValidator.validate(email)) {
      return dispatch({
        type: 'setError',
        value: _(msg`Your email appears to be invalid.`),
        field: 'email',
      })
    }
    if (emailChanged && tldtsRef.current) {
      if (isEmailMaybeInvalid(email, tldtsRef.current)) {
        prevEmailValueRef.current = email
        setHasWarnedEmail(true)
        return dispatch({
          type: 'setError',
          value: _(
            msg`Please double-check that you have entered your email address correctly.`,
          ),
        })
      }
    } else if (hasWarnedEmail) {
      setHasWarnedEmail(false)
    }
    prevEmailValueRef.current = email

    dispatch({type: 'setInviteCode', value: inviteCode})
    dispatch({type: 'setEmail', value: email})
    dispatch({type: 'clearError'})
    setConfirmedEmail(email)
    setSubStep('password')
  }

  const onPasswordNext = () => {
    const password = passwordValueRef.current

    if (!password) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please choose your password.`),
        field: 'password',
      })
    }
    if (password.length < 8) {
      return dispatch({
        type: 'setError',
        value: _(msg`Your password must be at least 8 characters long.`),
        field: 'password',
      })
    }

    dispatch({type: 'setPassword', value: password})
    dispatch({type: 'clearError'})
    setConfirmedPassword(password)
    setSubStep('birthdate')
  }

  const onBirthdateNext = () => {
    if (!isOverRegionMinAccessAge) {
      return
    }

    preemptivelyCompleteActivePolicyUpdate()
    dispatch({type: 'next'})
    ax.metric('signup:nextPressed', {
      activeStep: state.activeStep,
    })
  }

  const onBackPress = () => {
    dispatch({type: 'clearError'})
    if (subStep === 'email') {
      onPressBack()
    } else if (subStep === 'password') {
      setSubStep('email')
    } else {
      setSubStep('password')
    }
  }

  const onContinuePress = () => {
    if (subStep === 'email') {
      onEmailNext()
    } else if (subStep === 'password') {
      onPasswordNext()
    } else {
      onBirthdateNext()
    }
  }

  return (
    <>
      <View style={[a.gap_sm, a.pt_lg]}>
        <FormError error={state.error} />
        {state.isLoading || isLoadingStarterPack ? (
          <View style={[a.align_center]}>
            <Loader size="xl" />
          </View>
        ) : state.serviceDescription ? (
          <>
            {/* Invite code — always visible if required */}
            {state.serviceDescription.inviteCodeRequired &&
              subStep === 'email' && (
                <View>
                  <TextField.LabelText>
                    <Trans>Invite code</Trans>
                  </TextField.LabelText>
                  <TextField.Root
                    isInvalid={state.errorField === 'invite-code'}>
                    <TextField.Icon icon={Ticket} />
                    <TextField.Input
                      onChangeText={value => {
                        inviteCodeValueRef.current = value.trim()
                        if (
                          state.errorField === 'invite-code' &&
                          value.trim().length > 0
                        ) {
                          dispatch({type: 'clearError'})
                        }
                      }}
                      label={_(msg`Required for this provider`)}
                      defaultValue={state.inviteCode}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      returnKeyType="next"
                      submitBehavior={native('submit')}
                      onSubmitEditing={native(() =>
                        emailInputRef.current?.focus(),
                      )}
                    />
                  </TextField.Root>
                </View>
              )}

            {/* Email sub-step */}
            <ChatBubble>
              <Trans>Let's get you started! What's your email?</Trans>
            </ChatBubble>

            {subStep === 'email' ? (
              <Animated.View entering={FadeInUp.delay(200).duration(300)}>
                <TextField.Root isInvalid={state.errorField === 'email'}>
                  <TextField.Icon icon={Envelope} />
                  <TextField.Input
                    testID="emailInput"
                    inputRef={emailInputRef}
                    onChangeText={value => {
                      emailValueRef.current = value.trim()
                      if (hasWarnedEmail) {
                        setHasWarnedEmail(false)
                      }
                      if (
                        state.errorField === 'email' &&
                        value.trim().length > 0 &&
                        EmailValidator.validate(value.trim())
                      ) {
                        dispatch({type: 'clearError'})
                      }
                    }}
                    label={_(msg`Enter your email address`)}
                    defaultValue={state.email}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    autoFocus
                    returnKeyType="next"
                    submitBehavior={native('submit')}
                    onSubmitEditing={native(() => onEmailNext())}
                  />
                </TextField.Root>
              </Animated.View>
            ) : (
              <ChatBubble side="right">{confirmedEmail}</ChatBubble>
            )}

            {/* Password sub-step */}
            {(subStep === 'password' || subStep === 'birthdate') && (
              <>
                <ChatBubble delay={100}>
                  <Trans>Great! Now choose a secure password.</Trans>
                </ChatBubble>

                {subStep === 'password' ? (
                  <Animated.View entering={FadeInUp.delay(300).duration(300)}>
                    <TextField.Root
                      isInvalid={state.errorField === 'password'}>
                      <TextField.Icon icon={Lock} />
                      <TextField.Input
                        testID="passwordInput"
                        inputRef={passwordInputRef}
                        onChangeText={value => {
                          passwordValueRef.current = value
                          if (
                            state.errorField === 'password' &&
                            value.length >= 8
                          ) {
                            dispatch({type: 'clearError'})
                          }
                        }}
                        label={_(msg`Choose your password`)}
                        defaultValue={state.password}
                        secureTextEntry
                        autoComplete="new-password"
                        autoCapitalize="none"
                        autoFocus
                        returnKeyType="next"
                        submitBehavior={native('blurAndSubmit')}
                        onSubmitEditing={native(() => onPasswordNext())}
                        passwordRules="minlength: 8;"
                      />
                    </TextField.Root>
                  </Animated.View>
                ) : (
                  <ChatBubble side="right">
                    {'•'.repeat(confirmedPassword.length || 8)}
                  </ChatBubble>
                )}
              </>
            )}

            {/* Birthdate sub-step */}
            {subStep === 'birthdate' && (
              <>
                <ChatBubble delay={100}>
                  <Trans>Almost there! When's your birthday?</Trans>
                </ChatBubble>
                <Animated.View entering={FadeInUp.delay(300).duration(300)}>
                  <DateField.DateField
                    testID="date"
                    inputRef={birthdateInputRef}
                    value={state.dateOfBirth}
                    onChangeDate={date => {
                      dispatch({
                        type: 'setDateOfBirth',
                        value: sanitizeDate(new Date(date)),
                      })
                    }}
                    label={_(msg`Date of birth`)}
                    accessibilityHint={_(msg`Select your date of birth`)}
                    maximumDate={new Date()}
                  />

                  <View style={[a.gap_sm, a.mt_md]}>
                    <Policies serviceDescription={state.serviceDescription} />

                    {!isOverRegionMinAccessAge || !isOverAppMinAccessAge ? (
                      <Admonition.Outer type="error">
                        <Admonition.Row>
                          <Admonition.Icon />
                          <Admonition.Content>
                            <Admonition.Text>
                              {!isOverAppMinAccessAge ? (
                                <Trans>
                                  You must be {MIN_ACCESS_AGE} years of age or
                                  older to create an account.
                                </Trans>
                              ) : (
                                <Trans>
                                  You must be {aaRegionConfig.minAccessAge}{' '}
                                  years of age or older to create an account in
                                  your region.
                                </Trans>
                              )}
                            </Admonition.Text>
                            {IS_NATIVE &&
                              !isDeviceGeolocationGranted &&
                              isOverAppMinAccessAge && (
                                <Admonition.Text>
                                  <Trans>
                                    Have we got your location wrong?{' '}
                                    <SimpleInlineLinkText
                                      label={_(
                                        msg`Tap here to confirm your location with GPS.`,
                                      )}
                                      {...createStaticClick(() => {
                                        locationControl.open()
                                      })}>
                                      Tap here to confirm your location with
                                      GPS.
                                    </SimpleInlineLinkText>
                                  </Trans>
                                </Admonition.Text>
                              )}
                          </Admonition.Content>
                        </Admonition.Row>
                      </Admonition.Outer>
                    ) : !isOverMinAdultAge ? (
                      <Admonition.Admonition type="warning">
                        <Trans>
                          If you are not yet an adult according to the laws of
                          your country, your parent or legal guardian must read
                          these Terms on your behalf.
                        </Trans>
                      </Admonition.Admonition>
                    ) : undefined}
                  </View>
                </Animated.View>
              </>
            )}

            {IS_NATIVE && (
              <DeviceLocationRequestDialog
                control={locationControl}
                onLocationAcquired={props => {
                  props.closeDialog(() => {
                    setDeviceGeolocation(props.geolocation)
                    Toast.show(_(msg`Your location has been updated.`), {
                      type: 'success',
                    })
                  })
                }}
              />
            )}
          </>
        ) : undefined}
      </View>
      <View style={[a.flex_row, a.justify_between, a.pb_lg, a.pt_3xl]}>
        <Button
          label={_(msg`Go back to previous step`)}
          variant="solid"
          color="secondary"
          size="large"
          onPress={onBackPress}>
          <ButtonText>
            <Trans>Back</Trans>
          </ButtonText>
        </Button>
        {isServerError ? (
          <Button
            label={_(msg`Press to retry`)}
            variant="solid"
            color="primary"
            size="large"
            onPress={refetchServer}>
            <ButtonText>
              <Trans>Retry</Trans>
            </ButtonText>
          </Button>
        ) : (
          !(!isOverRegionMinAccessAge && subStep === 'birthdate') && (
            <Button
              testID="nextBtn"
              label={_(msg`Continue to next step`)}
              variant="solid"
              color="primary"
              size="large"
              disabled={state.isLoading}
              onPress={onContinuePress}>
              <ButtonText>
                {hasWarnedEmail ? (
                  _(msg`It's correct`)
                ) : (
                  <Trans>Continue</Trans>
                )}
              </ButtonText>
              {state.isLoading && <Loader />}
            </Button>
          )
        )}
      </View>
    </>
  )
}
