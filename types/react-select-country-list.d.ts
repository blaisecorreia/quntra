declare module 'react-select-country-list' {
    export type CountryOption = {
        value: string;
        label: string;
    };

    export type CountryList = {
        getData: () => CountryOption[];
        getLabel: (value: string) => string | undefined;
        getValue: (label: string) => string | undefined;
        getValues: () => string[];
        getLabels: () => string[];
    };

    export default function countryList(): CountryList;
}
