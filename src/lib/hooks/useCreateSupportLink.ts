import {useCallback} from 'react'

import {HELP_DESK_URL} from '#/lib/constants'
import {useSession} from '#/state/session'

export const SUPPORT_URL = `${HELP_DESK_URL}/contact`

export enum SupportCode {
  AA_DID = 'AA_DID',
  AA_BIRTHDATE = 'AA_BIRTHDATE',
}

export function useCreateSupportLink() {
  const {currentAccount} = useSession()

  return useCallback(
    ({code, email}: {code: SupportCode; email?: string}) => {
      const url = new URL(SUPPORT_URL)
      if (currentAccount) {
        url.search = new URLSearchParams({
          email: email || currentAccount.email || '',
          subject: `Support request [${code}]`,
          handle: currentAccount.handle + ` (${currentAccount.did})`,
        }).toString()
      }
      return url.toString()
    },
    [currentAccount],
  )
}
