import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-hm-background flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-hm-surface border border-hm-border rounded-xl p-8 shadow-xl">
            <div className="text-5xl mb-6">⚠️</div>
            <h1 className="text-2xl font-bold text-hm-text mb-2">Algo salió mal</h1>
            <p className="text-hm-muted text-sm mb-8">
              Ha ocurrido un error inesperado al procesar la pantalla actual. 
              El equipo de soporte ha sido notificado automáticamente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button 
                onClick={this.handleGoHome}
                className="flex-1 bg-hm-surface2 border border-hm-border text-hm-text font-mono text-sm py-2 px-4 rounded-lg hover:border-hm-accent transition-colors"
              >
                VOLVER AL INICIO
              </button>
              <button 
                onClick={this.handleRetry}
                className="flex-1 bg-hm-accent/10 border border-hm-accent/30 text-hm-accent font-mono font-bold text-sm py-2 px-4 rounded-lg hover:bg-hm-accent/20 hover:border-hm-accent/50 transition-colors"
              >
                REINTENTAR
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 text-left bg-red-900/20 border border-red-900/50 p-4 rounded text-xs font-mono text-red-400 overflow-auto max-h-40">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
