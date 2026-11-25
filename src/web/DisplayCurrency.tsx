import { useContext, useState } from "react";
import { displayCurrencies, type DisplayCurrency } from "../shared/currency";

/** Currency context to share currency state across components */
export const CurrencyContext = React.createContext({
  currency: "USD",
  setCurrency: (currency: DisplayCurrency) => void,
});

/** Currency display component with dropdown */
export function DisplayCurrencyDropdown({
  initialCurrency: DisplayCurrency = "USD",
}: {
  initialCurrency?: DisplayCurrency;
}) {
  const { currency, setCurrency } = useContext(CurrencyContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const currencyLabels: Record<DisplayCurrency, string> = {
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
    PKR: "PKR",
    AED: "AED",
    CAD: "CAD",
    AUD: "AUD",
  };
  
  const handleCurrencyChange = (currency: DisplayCurrency) => {
    setCurrency(currency);
    setIsDropdownOpen(false);
  };
  
  // Symbol mapping
  const symbols: Record<DisplayCurrency, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    PKR: "Rs.",
    AED: "د.إ",
    CAD: "C$",
    AUD: "A$",
  };
  
  return (
    <div className="currency-dropdown" role="button"
      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      aria-pressed={isDropdownOpen}
      aria-label="Select currency">
      <span className="currency-selected">
        {symbols[currency] || symbols.USD} {currency}
      </span>
      <svg className="currency-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <ul className="currency-list" role="menu" aria-orientation="vertical"
      style={{ display: isDropdownOpen ? "block" : "none" }}">
      {displayCurrencies.map((curr) => (
        <li
          key={curr}
          role="menuitem"
          tabIndex={0}
          onClick={() => handleCurrencyChange(curr)}
          style={{ fontWeight: curr === currency ? "500" : "normal" }}
        >
          <span className="currency-symbol" aria-hidden="true">{symbols[curr]}</span>
          {curr}
        </li>
      ))}
    </ul>
  );
}
