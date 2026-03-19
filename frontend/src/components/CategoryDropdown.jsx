export function CategoryDropdown({ categories = [], onChange, value }) {
    // Filter to show only top-level categories in the main list
    const parentCategories = categories.filter(c => !c.parent_id);

    const CategoryOption = ({ category, allCategories, depth = 0 }) => {
        const children = allCategories.filter(c => c.parent_id === category.id)
        return (
            <>
                <option key={category.id} value={category.id}>{!!depth && '- '.repeat(depth)}{category.name}</option>
                {children.length > 0 && children.map(child => {
                    return <CategoryOption key={child.id} category={child} allCategories={allCategories} depth={depth + 1} />
                })}
            </>
        )
    }

    return (
        <select className="w-full p-3 border rounded-xl" onChange={(e) => onChange(e.target.value)} value={value}>
            <option value="">Category</option>
            {parentCategories.map(parent => (
                <>
                    <CategoryOption
                        category={parent}
                        allCategories={categories}
                    />
                </>
            ))}
        </select>
    )
}