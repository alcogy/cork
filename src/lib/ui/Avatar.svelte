<script lang="ts">
	interface Props {
		name: string;
		accountId?: string | null;
		avatarKey?: string | null;
		size?: number;
	}

	let { name, accountId, avatarKey, size = 32 }: Props = $props();

	let imgError = $state(false);

	const showImg = $derived(!imgError && !!avatarKey && !!accountId);
	const initial = $derived((name || '?').charAt(0).toUpperCase());
	const fontSize = $derived(Math.round(size * 0.4));
</script>

{#if showImg}
	<img
		src="/api/avatar/{accountId}"
		alt={name}
		width={size}
		height={size}
		class="avatar-img"
		onerror={() => (imgError = true)}
	/>
{:else}
	<div class="avatar-initial" style="width:{size}px;height:{size}px;font-size:{fontSize}px">
		{initial}
	</div>
{/if}

<style lang="scss">
	.avatar-img {
		border-radius: 50%;
		object-fit: cover;
		display: block;
		flex-shrink: 0;
	}

	.avatar-initial {
		border-radius: 50%;
		background-color: var(--color-primary-light);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		flex-shrink: 0;
		user-select: none;
	}
</style>
