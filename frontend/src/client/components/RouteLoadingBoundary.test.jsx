import React, { createContext, useContext, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { RouteLoadingBoundary } from './RouteLoadingBoundary';

const State = createContext();
function Provider({ children }) {
  const [confirmation, setConfirmation] = useState('');
  return <State.Provider value={{ confirmation, setConfirmation }}>{children}</State.Provider>;
}
function Checkout() {
  const { setConfirmation } = useContext(State);
  return <Link to="/cart" onClick={() => setConfirmation('Order confirmed')}>Finish synthetic checkout</Link>;
}
function Cart() { return <p>{useContext(State).confirmation || 'No confirmation'}</p>; }
test('route chunk boundary preserves cart/provider state across checkout navigation', () => {
  render(<MemoryRouter initialEntries={['/checkout']}><RouteLoadingBoundary><Provider><Routes>
    <Route path="/checkout" element={<Checkout />} /><Route path="/cart" element={<Cart />} />
  </Routes></Provider></RouteLoadingBoundary></MemoryRouter>);
  fireEvent.click(screen.getByRole('link', { name: 'Finish synthetic checkout' }));
  expect(screen.getByText('Order confirmed')).toBeInTheDocument();
});
