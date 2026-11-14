import { useCountUp } from '../lib/useCountUp.js'

export default function Num({ value, suffix = '' }) {
  const v = useCountUp(value)
  return <>{v == null ? '—' : Math.round(v)}{suffix}</>
}
