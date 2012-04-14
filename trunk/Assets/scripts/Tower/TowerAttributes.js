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
var rangeCostExp : float;
var fireRateCostMult : float;
var fireRateCostExp : float;
var damageCostMult : float;
var damageCostExp : float;
var fovCostMult : float;
var fovCostExp : float;
var colorCostMult : float;
var colorCostExp : float;


var buildTime : float;
var rangeTimeCostMult : float;
var rangeTimeCostExp : float;
var fireRateTimeCostMult : float;
var fireRateTimeCostExp : float;
var damageTimeCostMult : float;
var damageTimeCostExp : float;
var fovCostTimeMult : float;
var fovCostTimeExp : float;
var colorTimeCostMult : float;
var colorTimeCostExp : float;