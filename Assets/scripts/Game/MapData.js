#pragma strict


var boundaries : Vector4;
var useCreditInfusions : boolean;
var useCreditCapacities : boolean;
var topDownCameraPos : Transform;
var nextLevel : String;

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



