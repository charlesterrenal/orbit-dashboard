import { Component } from 'react'
import Section from './Section.jsx'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? <Section title={`${this.props.label} unavailable`} alert /> : this.props.children
  }
}
