/*
 * This is a reimplementation of what exists in our HTML template files
 * already. Once the React tree mounts, this is what gets rendered first, until
 * the app is ready to go.
 */

import {View} from 'react-native'
import Svg, {Path} from 'react-native-svg'

import {atoms as a} from '#/alf'

const size = 100
const ratio = 57 / 64

export function Splash() {
  return (
    <View style={[a.fixed, a.inset_0, a.align_center, a.justify_center]}>
      <Svg
        fill="none"
        viewBox="0 0 64 57"
        style={[a.relative, {width: size, height: size * ratio, top: -50}]}>
        <Path
          d="M2 32 C2 32, 8 32, 14 32 C16 32, 17 30, 18 26 C19 22, 20 14, 22 10 C24 6, 26 4, 28 4 C30 4, 31 8, 32 16 C33 24, 33 28, 34 32 C35 36, 36 44, 37 48 C38 52, 39 54, 40 54 C41 54, 42 50, 43 44 C44 38, 45 34, 46 32 C47 30, 48 32, 50 32 C52 32, 58 32, 62 32"
          strokeWidth="4"
          stroke="#D600FB"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}
