<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.ico";
  import Header from "$lib/components/layout/Header.svelte";

  let { children } = $props();
  
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>
<Header></Header>
{@render children?.()}
