
export interface SalesRepresentativeDto {
    employeeID: number;
    employeeName: string;
}

export const getSalesRepresentatives = async (): Promise<SalesRepresentativeDto[]> => {
    const response = await api.get('/ledger/sales-representatives');
    return response.data;
};
