import React from "react";

const Input = ({
  type = "text",
  name,
  value,
  onChange,
  placeholder = "",
  label,
  required = false,
  className = "",
  step = undefined,
  min = undefined,
  max = undefined,
}) => {
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        max={max}
      />
    </div>
  );
};

export default Input;
