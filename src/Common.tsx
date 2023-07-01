import styled from 'styled-components'
import { Input } from './components/Controls'
import { BaseText, Label, SmallText } from './components/Text'
import { Main } from './components/Layout'
export const InputBox = styled(Input)`
  border-bottom: none;
  font-size: 16px;
  margin: 0;
  background: #e0e0e0;
  &:hover{
    border-bottom: none;
  }
`
export const LabelText = styled(BaseText)`
  white-space: nowrap;
`

export const WideLabel = styled(BaseText)`
  text-align: left;
  width: ${props => props.$width ?? '128px'};
`

export const Container = styled(Main)`
  margin: 0 auto;
  padding: 0 16px;
  max-width: 800px;
  // TODO: responsive
`

export const SmallTextGrey = styled(SmallText)`
  color: grey;
`
