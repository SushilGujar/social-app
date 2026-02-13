import React from 'react'
import {type TextProps} from 'react-native'
import Svg, {
  Defs,
  LinearGradient,
  Path,
  type PathProps,
  Stop,
  type SvgProps,
} from 'react-native-svg'

import {flatten, useTheme} from '#/alf'

const ratio = 57 / 64

type Props = {
  fill?: PathProps['fill']
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = React.forwardRef(function LogoImpl(props: Props, ref) {
  const t = useTheme()
  const {fill, ...rest} = props
  const gradient = fill === 'sky' || fill === 'pulse'
  const styles = flatten(props.style)
  const _fill = gradient
    ? 'url(#pulse)'
    : fill || styles?.color || t.palette.primary_500
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32, 10)

  return (
    <Svg
      fill="none"
      // @ts-ignore it's fiiiiine
      ref={ref}
      viewBox="0 0 64 57"
      {...rest}
      style={[{width: size, height: size * ratio}, styles]}>
      {gradient && (
        <Defs>
          <LinearGradient id="pulse" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#9C27B0" stopOpacity="1" />
            <Stop offset="1" stopColor="#FF4081" stopOpacity="1" />
          </LinearGradient>
        </Defs>
      )}

      <Path
        fill={_fill}
        d="M2 32 C2 32, 8 32, 14 32 C16 32, 17 30, 18 26 C19 22, 20 14, 22 10 C24 6, 26 4, 28 4 C30 4, 31 8, 32 16 C33 24, 33 28, 34 32 C35 36, 36 44, 37 48 C38 52, 39 54, 40 54 C41 54, 42 50, 43 44 C44 38, 45 34, 46 32 C47 30, 48 32, 50 32 C52 32, 58 32, 62 32"
        strokeWidth="4"
        stroke={_fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        fillOpacity="0"
      />
    </Svg>
  )
})
