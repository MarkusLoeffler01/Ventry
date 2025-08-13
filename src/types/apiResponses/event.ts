type General = {
    id: number;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: {
        name: string;
        address: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        createdAt: Date;
        updatedAt: Date;
    };
}


export type BookingOption = {
    id: number;
    name: string;
    description: string;
    price: number;
    eventId: number;
}

export default General;