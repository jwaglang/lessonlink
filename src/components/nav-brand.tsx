'use client';

export function NavBrand() {
  function handleClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new Event('kiddoland-bounce'));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <img src="/Logo Star Big.png" alt="Kiddoland" className="w-8 h-8 object-contain" />
      <span className="text-xl font-headline font-bold primary-gradient-text">Kiddoland</span>
    </button>
  );
}
