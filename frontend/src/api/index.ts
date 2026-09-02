const BASE = "/api/public";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json().catch(() => ({ code: -1, message: "网络异常" }));
  if (json.code !== 0) {
    throw new Error(json.message || "请求失败");
  }
  return json.data as T;
}

export interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  list: T[];
  pagination: Pagination;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  slogan: string;
  image: string;
  link: string;
  button_text: string;
  bg_color: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  description?: string;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  model: string;
  cover: string;
  images: string[];
  intro: string;
  detail: string;
  params: [string, string][];
  docs: string[];
}

export interface Solution {
  id: number;
  name: string;
  industry: string;
  cover: string;
  intro: string;
  detail: string;
  scenario: string;
  architecture: string;
  value_points: string[];
  related: Solution[];
}

export interface CaseItem {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  cover: string;
  intro: string;
  detail: string;
  tags: string[];
  results: [string, string][];
}

export interface Download {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  icon: string;
  intro: string;
  detail: string;
  version: string;
  files: [string, string, string][];
  size: string;
  update_log: string;
  system_require: string;
  download_count: number;
  related?: Download[];
}

export interface Article {
  id: number;
  category: string;
  title: string;
  cover: string;
  summary: string;
  content: string;
  tags: string[];
  author: string;
  views: number;
  is_top: number;
  publish_time: string;
  prev?: { id: number; title: string } | null;
  next?: { id: number; title: string } | null;
  related?: { id: number; title: string; cover: string; publish_time: string }[];
}

export interface HomeData {
  banners: Banner[];
  capabilities: { title: string; desc: string; icon: string; num: number; suffix: string; label: string }[];
  partners: { name: string; icon: string }[];
  products: Product[];
  solutions: Solution[];
  cases: CaseItem[];
  articles: Article[];
}

export interface SiteInfo {
  [key: string]: string;
}

export const api = {
  home: () => request<HomeData>("/home"),
  site: () => request<SiteInfo>("/site"),
  contact: () => request<SiteInfo>("/contact"),
  about: () => request<any>("/about"),
  banners: () => request<Banner[]>("/banners"),

  productCategories: () => request<Category[]>("/product-categories"),
  products: (params: Record<string, any> = {}) =>
    request<Paged<Product>>(`/products?${new URLSearchParams(params).toString()}`),
  product: (id: number) => request<Product & { related: Product[] }>(`/products/${id}`),

  solutions: () => request<Solution[]>("/solutions"),
  solution: (id: number) => request<Solution & { other: Solution[] }>(`/solutions/${id}`),

  caseCategories: () => request<Category[]>("/case-categories"),
  cases: (params: Record<string, any> = {}) =>
    request<Paged<CaseItem>>(`/cases?${new URLSearchParams(params).toString()}`),
  caseDetail: (id: number) => request<CaseItem>(`/cases/${id}`),

  downloadCategories: () => request<Category[]>("/download-categories"),
  downloads: (params: Record<string, any> = {}) =>
    request<Paged<Download>>(`/downloads?${new URLSearchParams(params).toString()}`),
  download: (id: number) => request<Download>(`/downloads/${id}`),
  downloadCount: (id: number) =>
    request<{ success: boolean }>(`/downloads/${id}/download`, { method: "POST" }),

  articles: (params: Record<string, any> = {}) =>
    request<Paged<Article>>(`/articles?${new URLSearchParams(params).toString()}`),
  article: (id: number) => request<Article>(`/articles/${id}`),

  submitMessage: (data: { name: string; phone: string; email?: string; subject?: string; content?: string }) =>
    request<{ id: number }>("/messages", { method: "POST", body: JSON.stringify(data) }),
};
