import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows onboarding and opens the demo dashboard', async () => {
    render(<App />)
    expect(screen.getAllByText('monotrat').length).toBeGreaterThan(0)
    fireEvent.click(await screen.findByRole('button', { name: 'Подивитись демо' }))
    expect(await screen.findByRole('heading', { name: 'Дашборд' })).toBeInTheDocument()
    expect(screen.getByText('витрачено')).toBeInTheDocument()
    expect(screen.getByText('Витрати за категоріями')).toBeInTheDocument()
    expect(screen.queryByText('Цей блок не вдалося показати. Решта дашборду працює.')).toBeNull()
  })
})
