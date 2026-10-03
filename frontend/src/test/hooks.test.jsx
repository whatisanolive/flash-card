import { describe, it, expect, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useDebounce } from '../hooks/useDebounce.js'
import { useForm } from '../hooks/useForm.js'
import { useApi } from '../hooks/useApi.js'

describe('useDebounce', () => {
  it('only updates after the value stops changing', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } })
    rerender({ v: 'ab' })
    rerender({ v: 'abc' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('abc')
    vi.useRealTimers()
  })
})

describe('useForm', () => {
  const validate = (v) => (v.name.trim() ? {} : { name: 'Name is required' })
  const setup = (onSubmit = vi.fn()) =>
    renderHook(() => useForm({ initialValues: { name: '' }, validate, onSubmit }))

  it('hides errors until the field is touched, and blocks invalid submits', async () => {
    const onSubmit = vi.fn()
    const { result } = setup(onSubmit)
    expect(result.current.errorFor('name')).toBeUndefined()
    await act(() => result.current.handleSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    expect(result.current.errorFor('name')).toBe('Name is required')
  })

  it('submits valid values', async () => {
    const onSubmit = vi.fn()
    const { result } = setup(onSubmit)
    act(() => result.current.setField('name', 'Ishita'))
    await act(() => result.current.handleSubmit())
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ishita' }, expect.any(Object))
  })

  it('shows server field errors and clears them when the field is edited', async () => {
    const { result } = setup(() => Promise.reject(Object.assign(new Error('Conflict'), { fields: { name: 'Taken' } })))
    act(() => result.current.setField('name', 'Dup'))
    await act(() => result.current.handleSubmit())
    expect(result.current.errorFor('name')).toBe('Taken')
    expect(result.current.formError).toBe('Conflict')
    act(() => result.current.setField('name', 'Dup2'))
    expect(result.current.errorFor('name')).toBeUndefined()
  })
})

describe('useApi', () => {
  it('loads data and exposes errors', async () => {
    const { result } = renderHook(() => useApi(() => Promise.resolve([1, 2]), []))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual([1, 2]))

    const failing = renderHook(() => useApi(() => Promise.reject(new Error('boom')), []))
    await waitFor(() => expect(failing.result.current.error?.message).toBe('boom'))
  })

  it('aborts the previous request when deps change', async () => {
    const signals = []
    const { rerender } = renderHook(({ q }) => useApi((signal) => (signals.push(signal), new Promise(() => {})), [q]), {
      initialProps: { q: 'a' },
    })
    rerender({ q: 'ab' })
    expect(signals[0].aborted).toBe(true)
    expect(signals.at(-1).aborted).toBe(false)
  })
})
