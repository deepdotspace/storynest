import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <h1 className="text-4xl font-serif text-foreground mb-2">Lost the page</h1>
      <p className="text-muted-foreground mb-6">That route doesn't exist.</p>
      <Link
        to="/"
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Back to start
      </Link>
    </div>
  )
}
