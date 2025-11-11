import { ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface ScrollToBottomButtonProps {
	show: boolean
	onClick: () => void
}

export const ScrollToBottomButton = ({
	show,
	onClick,
}: ScrollToBottomButtonProps) => {
	const isMobile = useIsMobile()

	if (!show) return null

	return (
		<button
			onClick={onClick}
			className={cn(
				"absolute right-4 bg-[rgb(210,113,254)] text-black p-2 rounded-full shadow-lg animate-bounce z-40",
				isMobile ? "bottom-20" : "bottom-20"
			)}
			aria-label="Scroll to bottom"
		>
			<ArrowDown size={16} />
		</button>
	)
}

