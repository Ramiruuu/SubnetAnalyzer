document.getElementById('subnetForm').addEventListener('submit', function (e) {
    e.preventDefault();
    analyzeSubnet();
});

function getClass(ip) {
    const firstOctet = parseInt(ip.split('.')[0]);
    if (firstOctet >= 1 && firstOctet <= 126) return 'Class A';
    if (firstOctet >= 128 && firstOctet <= 191) return 'Class B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'Class C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'Class D (Multicast)';
    if (firstOctet >= 240 && firstOctet <= 254) return 'Class E (Experimental)';
    return 'Invalid';
}

function parseCIDR(subnet) {
    const [ip, prefix] = subnet.split('/');
    if (!ip || !prefix) throw new Error('Invalid CIDR format');

    const prefixLength = parseInt(prefix);
    if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
        throw new Error('Invalid prefix length');
    }

    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
        throw new Error('Invalid IP address');
    }

    return { ip: octets, prefixLength };
}

function calculateNetworkAddress(ip, prefixLength) {
    const mask = ~(0xffffffff >>> prefixLength) >>> 0;
    const ipInt = (ip[0] << 24) + (ip[1] << 16) + (ip[2] << 8) + ip[3];
    const networkInt = ipInt & mask;
    return [
        (networkInt >>> 24) & 255,
        (networkInt >>> 16) & 255,
        (networkInt >>> 8) & 255,
        networkInt & 255
    ];
}

function calculateBroadcastAddress(ip, prefixLength) {
    const mask = ~(0xffffffff >>> prefixLength) >>> 0;
    const ipInt = (ip[0] << 24) + (ip[1] << 16) + (ip[2] << 8) + ip[3];
    const broadcastInt = ipInt | ~mask;
    return [
        (broadcastInt >>> 24) & 255,
        (broadcastInt >>> 16) & 255,
        (broadcastInt >>> 8) & 255,
        broadcastInt & 255
    ];
}

function usableRange(ip, prefixLength) {
    const network = calculateNetworkAddress(ip, prefixLength);
    const broadcast = calculateBroadcastAddress(ip, prefixLength);

    const networkInt = (network[0] << 24) + (network[1] << 16) + (network[2] << 8) + network[3];
    const broadcastInt = (broadcast[0] << 24) + (broadcast[1] << 16) + (broadcast[2] << 8) + broadcast[3];

    if (prefixLength >= 31) {
        if (prefixLength === 31) {
            // /31: Exactly 2 addresses (point-to-point)
            return [
                network.join('.'),
                broadcast.join('.')
            ];
        } else {
            // /32: No usable hosts
            return [null, null];
        }
    }

    // First usable host: network + 1
    const firstHostInt = networkInt + 1;
    const firstHost = [
        (firstHostInt >>> 24) & 255,
        (firstHostInt >>> 16) & 255,
        (firstHostInt >>> 8) & 255,
        firstHostInt & 255
    ];

    // Last usable host: broadcast - 1
    const lastHostInt = broadcastInt - 1;
    const lastHost = [
        (lastHostInt >>> 24) & 255,
        (lastHostInt >>> 16) & 255,
        (lastHostInt >>> 8) & 255,
        lastHostInt & 255
    ];

    return [firstHost.join('.'), lastHost.join('.')];
}

function analyzeSubnet() {
    const subnetInput = document.getElementById('subnetInput').value.trim();
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');

    // Reset previous results
    resultsDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    try {
        // Parse the subnet
        const { ip, prefixLength } = parseCIDR(subnetInput);
        const netClass = getClass(ip.join('.'));

        // Calculate network and broadcast addresses
        const networkAddress = calculateNetworkAddress(ip, prefixLength);
        const broadcastAddress = calculateBroadcastAddress(ip, prefixLength);

        // Get usable host range
        const [firstHost, lastHost] = usableRange(ip, prefixLength);

        // Display results
        document.getElementById('network').textContent = `${networkAddress.join('.')}/${prefixLength}`;
        document.getElementById('networkClass').textContent = netClass;
        document.getElementById('broadcast').textContent = broadcastAddress.join('.');
        document.getElementById('hostRange').textContent = firstHost && lastHost
            ? `${firstHost} - ${lastHost}`
            : 'No usable hosts in this network.';

        resultsDiv.classList.remove('hidden');
    } catch (err) {
        errorDiv.textContent = `❌ ${err.message || 'Invalid subnet. Please enter in CIDR format (e.g., 192.168.1.0/24)'}`;
        errorDiv.classList.remove('hidden');
    }
}