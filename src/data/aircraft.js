// speed = average cruise speed in km/h. layout = economy seats per row (used later by the seat map).
export const AIRCRAFT = {
  narrow: [
    { id: 'A320', name: 'Airbus A320', speed: 830, layout: '3-3', rows: 30 },
    { id: 'B738', name: 'Boeing 737-800', speed: 840, layout: '3-3', rows: 30 },
    { id: 'A21N', name: 'Airbus A321neo', speed: 840, layout: '3-3', rows: 34 },
  ],
  wide: [
    { id: 'B77W', name: 'Boeing 777-300ER', speed: 900, layout: '3-4-3', rows: 42 },
    { id: 'A359', name: 'Airbus A350-900', speed: 910, layout: '3-3-3', rows: 40 },
    { id: 'B789', name: 'Boeing 787-9', speed: 905, layout: '3-3-3', rows: 38 },
  ],
};
