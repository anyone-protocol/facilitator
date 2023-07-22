# Facility
`Facility` contract is dispatching events on EVM that represent demand of the user (represented with an EVM address) to claim available, assigned (to the user's address) Ator tokens.

`valid-ator` (using prefilled wallet + refilled by users) is subscribed to these EVM events and upon receival of user provided gas budget:
1. fetches current value of tokens allocated to a given user from Arweave
2. uses the user provided gas budget to update `Facility` with currently claimable Ator tokens

`Facility` contract is tracking the amounts of tokens claimed by user addresses.

`Facility` contract can receive Ator tokens that will available to be claimed.

`Facility` is using its Ator tokens to allow users claiming available reward balance and transfer Ator tokens to their EVM address.

Built on top of the [OpenZeppelin framework](https://openzeppelin.com/), developed using [HardHat env](https://hardhat.org/).

## Install
```bash
$ npm i
```

## Test
```bash
$ npm test
```

## Deploy (dev)
```bash
$ npx hardhat run --network <network-name> scripts/deploy.ts
```