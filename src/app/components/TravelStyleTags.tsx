interface TravelStyleTagsProps {
  tags: string[];
}

export function TravelStyleTags({ tags }: TravelStyleTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="px-4 py-2.5 bg-[#e8f5ed] text-[#5a5a5a] text-sm rounded-full"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
