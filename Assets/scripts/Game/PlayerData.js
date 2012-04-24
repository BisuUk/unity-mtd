#pragma strict
import System.Collections.Generic;

var isAttacker : boolean;
var credits : int;
var squads : Dictionary.<int,UnitSquad>;
var selectedSquad : UnitSquad;
var selectedEmitter : GameObject;
var selectedTower : GameObject;


function Start()
{
   selectedSquad = null;
   selectedTower = null;
   squads = new Dictionary.<int,UnitSquad>();
}

function AddSquad(squad : UnitSquad) : UnitSquad
{
   squads[squad.id] = squad;
   return squad;
}

function RemoveSquad(squadID : int)
{
   squads.Remove(squadID);
}

function SelectSquad(squadID : int)
{
   selectedSquad = (squadID < 0) ? null : GetSquadByID(squadID);
}

function GetSquadByID(squadID : int) : UnitSquad
{
   if (squads.ContainsKey(squadID))
      return squads[squadID];
   else
      return null;
}
