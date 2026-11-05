export interface Address {
  line: string;
  city: string;
  pincode: string;
}

/** One row of the list (`GET /customers`): no logo data, only whether there is a logo. */
export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneAlt?: string;
  address: Address;
  gstin: string;
  stateCode: string;
  hasLogo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPage {
  items: CustomerListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CustomerLogo {
  fileId: string;
  mime: string;
  size: number;
}

/** A whole customer (`GET /customers/:id`). */
export interface Customer extends Omit<CustomerListItem, "hasLogo"> {
  logo?: CustomerLogo;
  isDeleted: boolean;
  createdBy?: string;
  updatedBy?: string;
}

/** What the create form sends. `stateCode` is never sent: the API derives it from the GSTIN. */
export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  phoneAlt?: string;
  address: Address;
  gstin: string;
}

/** An edit may send any subset; `phoneAlt: null` removes it. */
export type CustomerUpdate = Partial<Omit<CustomerInput, "phoneAlt">> & { phoneAlt?: string | null };
