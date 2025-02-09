export interface RadioSelectOption {
  value: string;
  description: string;
  component?: () => React.ReactNode;
}

export interface RadioSelectProps {
  value: string | null;
  setValue: (newValue: string | null) => void;
  options: RadioSelectOption[];
}

export default function RadioSelect({
  value,
  setValue,
  options,
}: RadioSelectProps) {
  return (
    <>
      {options.map((option) => (
        <div className="flex gap-4" key={option.value}>
          <input
            id={option.value}
            type="radio"
            value={option.description}
            checked={option.value === value}
            onChange={(evt) => {
              if (evt.target.checked && value !== option.value) {
                setValue(option.value);
              } else if (value === option.value) {
                setValue(null);
              }
            }}
          />
          <div>
            <label htmlFor={option.value}>{option.description}</label>
          </div>
          <div>
            {option.component && value === option.value && option.component()}
          </div>
        </div>
      ))}
    </>
  );
}
