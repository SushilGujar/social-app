import {View} from 'react-native'
import Animated, {FadeInUp} from 'react-native-reanimated'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

type ChatBubbleProps = {
  children: React.ReactNode
  delay?: number
  side?: 'left' | 'right'
}

export function ChatBubble({
  children,
  delay = 0,
  side = 'left',
}: ChatBubbleProps) {
  const t = useTheme()
  const isRight = side === 'right'

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(300)}
      style={[
        a.mb_md,
        isRight ? a.self_end : a.self_start,
        {maxWidth: '85%'},
      ]}>
      <View
        style={[
          a.rounded_md,
          a.p_lg,
          isRight
            ? {
                backgroundColor: t.palette.primary_500,
                borderBottomRightRadius: 4,
              }
            : {
                ...t.atoms.bg_contrast_50,
                borderTopLeftRadius: 4,
              },
        ]}>
        <Text
          style={[
            a.text_md,
            a.leading_snug,
            isRight && {color: 'white'},
          ]}>
          {children}
        </Text>
      </View>
    </Animated.View>
  )
}
