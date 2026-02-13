import {createContext, useContext, useMemo} from 'react'

import {logger} from '#/logger'

type OnboardingScreen = 'welcome' | 'interests' | 'ready'

export type OnboardingState = {
  screens: Record<OnboardingScreen, boolean>
  activeStep: OnboardingScreen
  stepTransitionDirection: 'Forward' | 'Backward'

  interestsStepResults: {
    selectedInterests: string[]
  }
  profileStepResults: {
    displayName: string
    image?: {
      path: string
      mime: string
      size: number
      width: number
      height: number
    }
    imageUri?: string
    imageMime?: string
  }
}

export type OnboardingAction =
  | {
      type: 'next'
    }
  | {
      type: 'prev'
    }
  | {
      type: 'finish'
    }
  | {
      type: 'setInterestsStepResults'
      selectedInterests: string[]
    }
  | {
      type: 'setProfileStepResults'
      displayName: string
      image: OnboardingState['profileStepResults']['image'] | undefined
      imageUri: string | undefined
      imageMime: string
    }

export function createInitialOnboardingState(): OnboardingState {
  const screens: OnboardingState['screens'] = {
    welcome: true,
    interests: true,
    ready: true,
  }

  return {
    screens,
    activeStep: 'welcome',
    stepTransitionDirection: 'Forward',
    interestsStepResults: {
      selectedInterests: [],
    },
    profileStepResults: {
      displayName: '',
      image: undefined,
      imageUri: '',
      imageMime: '',
    },
  }
}

export const Context = createContext<{
  state: OnboardingState
  dispatch: React.Dispatch<OnboardingAction>
} | null>(null)
Context.displayName = 'OnboardingContext'

export function reducer(
  s: OnboardingState,
  a: OnboardingAction,
): OnboardingState {
  let next = {...s}

  const stepOrder = getStepOrder(s)

  switch (a.type) {
    case 'next': {
      const nextIndex = stepOrder.indexOf(next.activeStep) + 1
      const nextStep = stepOrder[nextIndex]
      if (nextStep) {
        next.activeStep = nextStep
      }
      next.stepTransitionDirection = 'Forward'
      break
    }
    case 'prev': {
      const prevIndex = stepOrder.indexOf(next.activeStep) - 1
      const prevStep = stepOrder[prevIndex]
      if (prevStep) {
        next.activeStep = prevStep
      }
      next.stepTransitionDirection = 'Backward'
      break
    }
    case 'finish': {
      next = createInitialOnboardingState()
      break
    }
    case 'setInterestsStepResults': {
      next.interestsStepResults = {
        selectedInterests: a.selectedInterests,
      }
      break
    }
    case 'setProfileStepResults': {
      next.profileStepResults = {
        displayName: a.displayName,
        image: a.image,
        imageUri: a.imageUri,
        imageMime: a.imageMime,
      }
      break
    }
  }

  const state = {
    ...next,
    hasPrev: next.activeStep !== 'welcome',
  }

  logger.debug(`onboarding`, {
    hasPrev: state.hasPrev,
    activeStep: state.activeStep,
    interestsStepResults: {
      selectedInterests: state.interestsStepResults.selectedInterests,
    },
    profileStepResults: state.profileStepResults,
  })

  if (s.activeStep !== state.activeStep) {
    logger.debug(`onboarding: step changed`, {activeStep: state.activeStep})
  }

  return state
}

function getStepOrder(s: OnboardingState): OnboardingScreen[] {
  return [
    s.screens.welcome && ('welcome' as const),
    s.screens.interests && ('interests' as const),
    s.screens.ready && ('ready' as const),
  ].filter(x => !!x)
}

/**
 * Note: not to be confused with `useOnboardingState`, which just determines if onboarding is active.
 * This hook is for internal state of the onboarding flow (i.e. active step etc).
 *
 * This adds additional derived state to the onboarding context reducer.
 */
export function useOnboardingInternalState() {
  const ctx = useContext(Context)

  if (!ctx) {
    throw new Error(
      'useOnboardingInternalState must be used within OnboardingContext',
    )
  }

  const {state, dispatch} = ctx

  return {
    state: useMemo(() => {
      const stepOrder = getStepOrder(state).filter(
        x => x !== 'ready',
      ) as string[]
      const canGoBack = state.activeStep !== stepOrder[0]
      return {
        ...state,
        canGoBack,
        activeStepIndex: stepOrder.indexOf(state.activeStep),
        totalSteps: stepOrder.length,
      }
    }, [state]),
    dispatch,
  }
}
