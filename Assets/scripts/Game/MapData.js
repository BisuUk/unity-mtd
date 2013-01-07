#pragma strict

var boundaryLower : Transform;
var boundaryUpper : Transform;
var topDownCameraPos : Transform;
var nextLevel : String;

// Puzzle mode
var unitMax : int;
var unitPar : int;
var timeBonusLimit : float;
var timeBonusPerSecond : int;
var underParBonusPerUnit : int;
var noDeathBonus : int;
var noAbilityBonus : int;

// TD mode
var useCreditInfusions : boolean;
var useCreditCapacities : boolean;
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

var splatterDecalManager : DecalManager;



