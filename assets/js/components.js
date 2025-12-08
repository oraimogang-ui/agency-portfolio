document.addEventListener("DOMContentLoaded", function () {
    const footerHTML = `
    <footer class="border-t border-white/10 px-6 py-12 flex justify-between items-end bg-[#050505] mt-auto">
        <div>
            <p class="text-[10px] text-white/30 uppercase tracking-widest">&copy; 2025 Craden Studio. All Rights Reserved.</p>
        </div>
        <div class="flex gap-6">
            <a href="#" class="text-xs text-white/50 hover:text-white transition-colors">Twitter/X</a>
            <a href="#" class="text-xs text-white/50 hover:text-white transition-colors">LinkedIn</a>
            <a href="#" class="text-xs text-white/50 hover:text-white transition-colors">Instagram</a>
        </div>
    </footer>
    `;
    const footerPlaceholder = document.getElementById("global-footer");
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = footerHTML;
    }
});
