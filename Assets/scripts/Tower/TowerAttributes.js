#pragma strict


var minRange : float;
var maxRange : float;
var defaultRange : float;
var minFOV : float;
var maxFOV : float;
var defaultFOV : float;
var defaultEffect : int;
var minFireRate : float;
var maxFireRate : float;
var defaultFireRate : float;
var minStrength : float;
var maxStrength : float;
var defaultStrength : float;
var defaultTargetBehavior : int;

var minCost : int;
var maxCost : int;
var maxTimeCost : float;
var maxColorCost : float;
var maxColorTimeCost : float;
var buildTime : float;
/*
var rangeCostWeight : float;
var fovCostWeight : float;
var fireRateCostWeight : float;
var strengthCostWeight : float;
var rangeTimeCostMult : float;
var rangeTimeCostExp : float;
var fireRateTimeCostMult : float;
var fireRateTimeCostExp : float;
var strengthTimeCostMult : float;
var strengthTimeCostExp : float;
var fovCostTimeMult : float;
var fovCostTimeExp : float;
*/

function AdjustRange(theRange : float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(minRange, maxRange, theRange) : Mathf.Lerp(minRange, maxRange, theRange);
}

function AdjustFOV(theFOV : float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(minFOV, maxFOV, theFOV) : Mathf.Lerp(minFOV, maxFOV, theFOV);
}

function AdjustFireRate(theFireRate : float, normalize : boolean) : float
{
   //return (normalize) ? Mathf.InverseLerp(maxFireRate, minFireRate, theFireRate) : Mathf.Lerp(maxFireRate, minFireRate, theFireRate);
   return (normalize) ? Mathf.InverseLerp(minFireRate, maxFireRate, theFireRate) : Mathf.Lerp(minFireRate, maxFireRate, theFireRate);
}

function AdjustStrength(theStrength: float, normalize : boolean) : float
{
   return (normalize) ? Mathf.InverseLerp(minStrength, maxStrength, theStrength) : Mathf.Lerp(minStrength, maxStrength, theStrength);
}