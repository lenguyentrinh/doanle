import { api } from "@/services/api";
import type { MeResponse, ProfilePayload, Address, AddressPayload } from "@/types/user";

interface ActionResponse {
  message: string;
}

const updateProfileAPI = async (data: ProfilePayload) => {
  const res = await api.patch("/api/users/profile", data);
  return res.data as MeResponse;
};

const getAddressesAPI = async () => {
  const res = await api.get("/api/users/addresses");
  return res.data.data as Address[];
};

const createAddressAPI = async (data: AddressPayload) => {
  const res = await api.post("/api/users/addresses", data);
  return res.data as Address;
};

const editAddressAPI = async (id: number, data: AddressPayload) => {
  const res = await api.patch("/api/users/addresses/" + id, data);
  return res.data as Address;
};

const setDefaultAddressAPI = async (id: number) => {
  const res = await api.patch("/api/users/addresses/" + id + "/default");
  return res.data.data as Address[];
};

const deleteAddressAPI = async (id: number) => {
  const res = await api.delete("/api/users/addresses/" + id);
  return res.data as ActionResponse;
};

export {
  updateProfileAPI,
  getAddressesAPI,
  createAddressAPI,
  editAddressAPI,
  setDefaultAddressAPI,
  deleteAddressAPI,
};