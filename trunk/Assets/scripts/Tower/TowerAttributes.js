#pragma strict


var minRange : float;
var maxRange : float;
var defaultRange : float;
var minFireRate : float;
var maxFireRate : float;
var defaultFireRate : float;
var minDamage : float;
var maxDamage : float;
var defaultDamage : float;
var minFOV : float;
var maxFOV : float;
var defaultFOV : float;

var cost : int;
var rangeCostMult : float;
var fireRateCostMult : float;
var damageCostMult : float;
var fovCostMult : float;

var buildTime : float;
var rangeTimeCostMult : float;
var fireRateTimeCostMult : float;
var damageTimeCostMult : float;
var fovCostTimeMult : float;