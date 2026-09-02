import { ref } from "vue";

export function usePagination() {
  const page = ref(1);
  const totalPages = ref(1);

  function pages() {
    const arr: number[] = [];
    for (let i = 1; i <= totalPages.value; i++) arr.push(i);
    return arr;
  }

  function goPage(p: number, callback: () => void, scrollTop = 320) {
    page.value = p;
    callback();
    window.scrollTo({ top: scrollTop, behavior: "smooth" });
  }

  return { page, totalPages, pages, goPage };
}