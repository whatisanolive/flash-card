import { Component } from 'react'

// Catches render-time crashes in any child so one broken page never
// blanks the whole app. Must be a class — hooks can't catch render errors.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="error-state error-state--page" role="alert">
        <p className="error-state__title">This page hit an unexpected error</p>
        <p className="error-state__msg">{this.state.error.message}</p>
        <div className="empty-state__actions">
          <button className="btn btn--ghost" onClick={() => (window.location.href = '/')}>
            Go home
          </button>
          <button className="btn btn--primary" onClick={this.reset}>
            Try again
          </button>
        </div>
      </div>
    )
  }
}
