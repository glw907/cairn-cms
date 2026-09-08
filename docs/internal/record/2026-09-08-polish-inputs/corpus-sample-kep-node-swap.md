We summarize the implementation plan as following:

1. Add a feature gate `NodeSwap` to enable swap support.
1. Leave the default value of kubelet flag `--fail-on-swap` to `true`, to avoid changing default
   behaviour.
1. Introduce a new kubelet config parameter, `MemorySwap`, which configures how much swap
   Kubernetes workloads can use on the node.
1. Introduce a new CRI parameter, `memory_swap_limit_in_bytes`.
1. Ensure container runtimes are updated so they can make use of the new CRI configuration.
1. Based on the behaviour set in the kubelet config, the kubelet will instruct the CRI on the
   amount of swap to allocate to each container. The container runtime will then write the swap
   settings to the container level cgroup.
1. Add node stats to report swap usage.

Swap can be enabled as follows:

1. Provision swap on the target worker nodes,
1. Enable the `NodeSwap` feature flag on the kubelet,
1. Set `--fail-on-swap` flag to `false`, and
1. (Optional) Allow Kubernetes workloads to use swap by setting `MemorySwap.SwapBehavior` to
   `LimitedSwap` in the kubelet config.

Having swap available on a system reduces predictability. Swap's performance is worse than regular
memory, sometimes by many orders of magnitude, which can cause unexpected performance regressions.
Furthermore, swap changes a system's behaviour under memory pressure, and applications cannot
directly control what portions of their memory usage are swapped out. Since enabling swap permits
greater memory usage for workloads in Kubernetes that cannot be predictably accounted for, it also
increases the risk of noisy neighbours and unexpected packing configurations, as the scheduler
cannot account for swap memory usage.

This risk is mitigated by preventing any workloads from using swap by default, even if swap is
enabled and available on a system. This will allow a cluster administrator to test swap
utilization just at the system level without introducing unpredictability to workload resource
utilization.

Additionally, we will mitigate this risk by determining a set of metrics to quantify system
stability and then gathering test and production data to determine if system stability changes
when swap is available to the system and/or workloads in a number of different scenarios.

Since swap provisioning is out of scope of this proposal, this enhancement poses low risk to
Kubernetes clusters that will not enable swap.

## Source

KEP-2400, "Node memory swap support", Kubernetes enhancement proposal, SIG Node.
https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/2400-node-swap/README.md,
fetched 2026-09-08 from
https://raw.githubusercontent.com/kubernetes/enhancements/master/keps/sig-node/2400-node-swap/README.md.
The kubernetes/enhancements repository is Apache 2.0 licensed; this excerpt is quoted for
comparison and is unedited apart from rewrapping and the removal of three headings.

The excerpt is the opening of the document's "Design Details" section, its "Enabling swap as an end
user" subsection, and the lead of its "Risks and Mitigations" subsection. The KEP template's
heading spine, which the docs-standard design spec draws its goals, non-goals, risk, and
graduation-criteria sections from, is: Summary, Motivation with Goals and Non-Goals beneath it,
Proposal with Risks and Mitigations beneath it, Design Details with Test Plan and Graduation
Criteria beneath it, then Drawbacks and Alternatives.

A proposed corpus entry for the internal design-spec page type, not yet approved. Measure it with
`--until "## Source"`.
