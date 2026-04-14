<script>
    import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">errore root {$page.status}</h1>
        <p class="text-lg text-gray-600 mb-6">{$page.error?.message ?? "Si è verificato un errore inaspettato"}</p>

        <div class="flex flex-col gap-3">
            <a 
                href="/" 
                class="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-500 transition-colors"
            >
                Torna alla home
            </a>
            <a 
                href="/admin/azure-vicenza" 
                class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition-colors"
            >
                Area Admin
            </a>
        </div>
    </div>
</div>