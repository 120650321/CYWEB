import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

export function useDetailPage<T>(fetcher: (id: number) => Promise<T>) {
  const route = useRoute();
  const data = ref<T | null>(null);
  const loading = ref(true);
  const notFound = ref(false);

  async function load(id: number) {
    loading.value = true;
    notFound.value = false;
    data.value = null;
    try {
      data.value = await fetcher(id);
    } catch {
      notFound.value = true;
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => load(Number(route.params.id)));
  watch(() => route.params.id, (id) => id && load(Number(id)));

  return { data, loading, notFound, load };
}