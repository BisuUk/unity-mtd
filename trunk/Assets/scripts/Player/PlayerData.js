#pragma strict
import System.Collections.Generic;

var playerID : int;
var squads : Dictionary.<int,UnitSquad>;
var selectedTower : GameObject;
var selectedSquad : UnitSquad;


function Start()
{
   selectedSquad = null;
   selectedTower = null;
   squads = new Dictionary.<int,UnitSquad>();
}

function AddSquad(squad : UnitSquad)
{
   squads[squad.id] = squad;
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
