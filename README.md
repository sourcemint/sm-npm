Sourcemint for NPM
==================

*Status: ALPHA*

The sourcemint `sm` command delivered via [NPM](http://npmjs.org/).

  * Copyright: 2012 [Christoph Dorn](http://www.christophdorn.com/)
  * Code License: [MIT License](http://www.opensource.org/licenses/mit-license.php)
  * Docs License: [Creative Commons Attribution-NonCommercial-ShareAlike 3.0](http://creativecommons.org/licenses/by-nc-sa/3.0/)
  * Sponsor: [Sourcemint](http://sourcemint.com/)
  * Mailing list: [groups.google.com/group/sourcemint](http://groups.google.com/group/sourcemint)


Install
=======

    npm install -g sm


    sm -h
    
    ------------------ sourcemint.org ------------------
    |          Sourcemint Open Source Tooling          |
    |         ~ Package Management. Evolved. ~         |
    |   News   : twitter.com/sourcemint                |
    |   Discuss: groups.google.com/group/sourcemint    |
    |   Source : github.com/sourcemint/sm-npm          |
    |   Bugs   : github.com/sourcemint/sm-npm/issues   |
    |   DOCS   : bit.ly/sm-wiki                        |
    ----- (c) 2012+ Christoph Dorn -- License: MIT -----
    Usage: sm [OPTIONS] COMMAND
    Run sourcemint tools on the specified package/program path.
      bump : Bump the package/program version.
      clone : Clone a package/program from a URI.
      deploy : Deploy the package/program.
      edit : Setup a dependency (see `sm status`) package for editing (similar to `npm link` but local).
      fix : Fix a package/program aspect.
      help : Help for package/program.
      install : Install package/program.
      publish : Publish package/program.
      status : Check package/program status.
      update : Update package/program.
     --version : Show `sm` version.
     -h --help : displays usage information (final option)
