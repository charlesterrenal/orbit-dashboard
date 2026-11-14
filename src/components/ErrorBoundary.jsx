import { Component } from 'react'
import Panel from './Panel.jsx'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? <Panel label={this.props.label} unavailable /> : this.props.children
  }
}
