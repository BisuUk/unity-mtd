#pragma strict


var center : Transform;
var boundaryRadius : float;
var boundaryHeights : Vector2;

var useCreditInfusions : boolean;
var useCreditCapacities : boolean;
var topDownCameraPos : Transform;
var nextLevel : String;

var unitMax : int;
var unitPar : int;
var timeBonusLimit : float;
var timeBonusPerSecond : int;
var underParBonusPerUnit : int;
var noDeathBonus : int;
var noAbilityBonus : int;

var attackStartCredits : int;
var attackStartCreditCapacity : int;
var attackCreditInfusionStartSize : int;
var attackCreditInfusionEndSize : int;
var attackCreditInfusionFreq : float;
var attackDefaultCameraPos : Transform;

var defendStartCredits : int;
var defendCreditInfusionStartSize : int;
var defendCreditInfusionEndSize : int;
var defendCreditInfusionFreq : float;
var defendDefaultCameraPos : Transform;



