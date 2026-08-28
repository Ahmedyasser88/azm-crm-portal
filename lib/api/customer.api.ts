import { apiServerFetch } from "./fetch";
import type { Customer, CustomerListItem } from "../types/customer";
import type { CustomerAttachment } from "../types/customerAttachment";
import type { CustomerInteraction } from "../types/customerInteraction";
import type { CustomerNote } from "../types/customerNote";
import type { PaginatedResult } from "../types/pagination";

const CUSTOMERS_URL = "/api/customers";

export const customerEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; search?: string }) =>
    apiServerFetch<PaginatedResult<CustomerListItem>>({
      url: CUSTOMERS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        search: params.search,
      },
      cache: "no-store",
    }),
  getById: (id: string) =>
    apiServerFetch<Customer>({ url: `${CUSTOMERS_URL}/${id}`, cache: "no-store" }),
  interactions: {
    list: (customerId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<CustomerInteraction>>({
        url: `${CUSTOMERS_URL}/${customerId}/interactions`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
  notes: {
    list: (customerId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<CustomerNote>>({
        url: `${CUSTOMERS_URL}/${customerId}/notes`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
  attachments: {
    list: (customerId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<CustomerAttachment>>({
        url: `${CUSTOMERS_URL}/${customerId}/attachments`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
};
