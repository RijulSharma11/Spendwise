import { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext(null);

const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN', rate: 1 },
  USD: { symbol: '$', locale: 'en-US', rate: 1 / 83.5 },
  EUR: { symbol: '€', locale: 'de-DE', rate: 0.92 / 83.5 },
  GBP: { symbol: '£', locale: 'en-GB', rate: 0.79 / 83.5 },
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem('spendwise_currency') || 'INR';
  });

  const setCurrency = (newCurrency) => {
    if (CURRENCIES[newCurrency]) {
      setCurrencyState(newCurrency);
      localStorage.setItem('spendwise_currency', newCurrency);
    }
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    const config = CURRENCIES[currency] || CURRENCIES.INR;
    const converted = num * config.rate;

    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'INR' ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        currencies: Object.keys(CURRENCIES),
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
