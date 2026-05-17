<script lang="ts">
	interface Props {
		currentPage: number;
		totalPages: number;
		totalItems?: number;
		itemsPerPage?: number;
		onpagechange: (page: number) => void;
	}

	let { currentPage, totalPages, totalItems, itemsPerPage, onpagechange }: Props = $props();

	const startItem = $derived(
		totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined
	);
	const endItem = $derived(
		totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : undefined
	);

	const canGoPrevious = $derived(currentPage > 1);
	const canGoNext = $derived(currentPage < totalPages);
</script>

{#if totalPages > 1}
	<div class="pagination">
		{#if totalItems !== undefined && startItem !== undefined && endItem !== undefined}
			<div class="pagination-info">
				{startItem}–{endItem} of {totalItems}
			</div>
		{/if}
		<div class="pagination-controls">
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoPrevious}
				onclick={() => onpagechange(1)}
				aria-label="First page"
			>
				«
			</button>
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoPrevious}
				onclick={() => onpagechange(currentPage - 1)}
				aria-label="Previous page"
			>
				‹
			</button>
			<span class="current-page">Page {currentPage} of {totalPages}</span>
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoNext}
				onclick={() => onpagechange(currentPage + 1)}
				aria-label="Next page"
			>
				›
			</button>
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoNext}
				onclick={() => onpagechange(totalPages)}
				aria-label="Last page"
			>
				»
			</button>
		</div>
	</div>
{/if}

<style lang="scss">
	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-light);
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.pagination-info {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.pagination-button {
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-sm);
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
		cursor: pointer;
		font-size: 0.875rem;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover:not(:disabled) {
			background-color: var(--color-hover);
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.current-page {
		padding: var(--space-xs) var(--space-md);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}
</style>
