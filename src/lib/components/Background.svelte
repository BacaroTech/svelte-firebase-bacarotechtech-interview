<script lang="ts">
    let { children } = $props();
</script>
<!-- bg-gradient-to-l  from-primary-800 from-0% via-primary-700 via-50% to-primary-900 -->
<div class=" bg-gray-100
        to-100% h-full w-full p-4 flex justify-center items-center" >
        {@render children?.()}
</div>