import { initials } from "@/lib/format";

export default function Avatar({
  name,
  email,
  image,
  size = 36,
  className = "",
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name ?? "avatar"}
        style={dim}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={{ ...dim, fontSize: Math.round(size * 0.36) }}
      className={`rounded-full bg-ink text-white grid place-items-center font-semibold ${className}`}
    >
      {initials(name, email)}
    </div>
  );
}
